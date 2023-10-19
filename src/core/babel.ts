import { parse } from '@babel/parser'
import { traverse } from '@babel/core'
import * as generator from '@babel/generator'
import t, { objectExpression } from '@babel/types'

const mutationsList: {
  [key: string]: {
    params: string
    body: any
  }
} = {}
const stateNameList = ['state', 'state2']

function getFullMemberExpression(node: t.MemberExpression): string {
  const nodeObject = node.object
  const propety = node.property
  if (t.isIdentifier(nodeObject) && t.isIdentifier(propety))
    return `${nodeObject.name}.${propety.name}`

  if (t.isMemberExpression(nodeObject) && t.isIdentifier(propety))
    return `${getFullMemberExpression(nodeObject)}.${propety.name}`

  console.error('getFullMemberExpression: 未知类型')
  return ''
}

export function traverseCode(code: string, id: string) {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['typescript'],
  })

  traverse(ast, { // 收集 mutationsList
    VariableDeclarator(path) {
      if (!('name' in path.node.id))
        return
      if (path.node.id.name === 'mutations') {
        if (!path.node.init)
          return
        if (!('properties' in path.node.init))
          return
        const mutations = path.node.init.properties
        mutations.forEach((item) => {
          if (t.isObjectProperty(item)) {
            if (!t.isObjectProperty(item))
              return
            const value = item.value
            if (t.isFunctionExpression(value) || t.isArrowFunctionExpression(value)) {
              const paramsReal = value.params[1]
              if (!t.isIdentifier(paramsReal))
                return
              const params = paramsReal.name
              const body = value.body
              if (!t.isBlockStatement(body))
                return
              let key = ''
              if (t.isMemberExpression(item.key) && t.isIdentifier(item.key.property))
                 key = item.key.property.name
              else if (t.isIdentifier(item.key))
                key = item.key.name
              mutationsList[key] = {
                params,
                body: body.body,
              }
            }
          }
          else if (t.isObjectMethod(item)) {
            /** 兼容
             *   [MutationTypes.UPDATE_USEDCAR_COOPERATE_INFO] (state: State, data) {
                    state.contactInfoList = data.contact_infos
                    state.totalCount = data.total_count
                    state.page = data.page
                    state.count = data.count
                  }
             */
            const paramsReal = item.params[1]
            if (!t.isIdentifier(paramsReal))
              return
            const params = paramsReal.name
            const body = item.body
            let key = ''
            if (t.isMemberExpression(item.key) && t.isIdentifier(item.key.property))
              key = item.key.property.name

            else if (t.isIdentifier(item.key))
              key = item.key.name
            mutationsList[key] = {
              params,
              body: body.body,
            }
          }
        })
        path.remove()
      }
    },
  })
  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value.includes('rest/config'))
        path.node.source.value = '@/rest/config'
      if (path.node.source.value.includes('mutation') || path.node.source.value.includes('vuex'))
        path.remove()
    },
    ExportDefaultDeclaration(path) {
      path.remove()
    },
    VariableDeclarator(path) {
      if (!('name' in path.node.id))
        return
      if (path.node.id.name === 'actions') {
        if (!path.node.init)
          return
        if (!('properties' in path.node.init))
          return
        const actions = path.node.init?.properties
        actions.forEach((item) => {
          if (!('params' in item))
            return
          item.params.shift()
        })
        path.node.init.properties = actions
      }
      if (path.node && path.node.id.name === 'getters')
        path.remove()
    },
    CallExpression(path) {
      if (!t.isIdentifier(path.node.callee))
        return
      if (path.node.callee.name === 'commit') {
        const callArguments = path.node.arguments
        const [mutation, needReplace] = callArguments
        let mutationName = ''
        if (t.isMemberExpression(mutation) && t.isIdentifier(mutation.property))
          mutationName = mutation.property.name

        else if (t.isIdentifier(mutation))
          mutationName = mutation.name

        const getNeedToReplaceCode = () => {
          if (!needReplace)
            return
          switch (needReplace.type) {
            case 'Identifier':
              return needReplace.name
            case 'MemberExpression':
              // return `${(needReplace.object as t.Identifier).name}.${(needReplace.property as t.Identifier).name}`
              return getFullMemberExpression(needReplace)
            case 'BooleanLiteral':
              return (needReplace as t.BooleanLiteral).value
          }
        }

        const needToReplaceCode
          = getNeedToReplaceCode()

        const target = mutationsList[mutationName]

        if (!target)
          return
        const { params, body } = target
        body.forEach((item: any) => {
          if (t.isExpressionStatement(item) && t.isAssignmentExpression(item.expression)) {
            const right = item.expression.right
            if (t.isMemberExpression(right) && t.isIdentifier(right.object) && typeof needToReplaceCode === 'string') {
              if (right.object.name === params)
                right.object.name = needToReplaceCode
            }
            if (t.isCallExpression(right)) {
              if (t.isMemberExpression(right.callee) && typeof needToReplaceCode === 'string') {
                if (t.isIdentifier(right.callee.object) && right.callee.object.name === params)
                  right.callee.object.name = needToReplaceCode

                if (t.isMemberExpression(right.callee.object)) {
                  const object = right.callee.object
                  if (t.isIdentifier(object.object) && object.object.name === params)
                    object.object.name = needToReplaceCode
                }
                if (t.isCallExpression(right.callee.object)) {
                  const object = right.callee.object
                  const rightCallObjectArguments = object.arguments
                  if (rightCallObjectArguments.length === 1) {
                    if (t.isIdentifier(rightCallObjectArguments[0]) && rightCallObjectArguments[0].name === params)
                      rightCallObjectArguments[0].name = needToReplaceCode
                    if (t.isMemberExpression(rightCallObjectArguments[0]) && t.isIdentifier(rightCallObjectArguments[0].object) && typeof needToReplaceCode === 'string')
                      rightCallObjectArguments[0].object.name = needToReplaceCode
                  }
                }
              }
            }
            if (t.isLogicalExpression(right)) {
              if (t.isMemberExpression(right.left) && typeof needToReplaceCode === 'string') {
                if (t.isIdentifier(right.left.object) && right.left.object.name === params)
                  right.left.object.name = needToReplaceCode
              }
            }

            if (t.isConditionalExpression(right) && t.isIdentifier(right.test) && t.isMemberExpression(right.consequent) && typeof needToReplaceCode === 'string') {
              right.test.name = needToReplaceCode
              if (!t.isIdentifier(right.consequent.object))
                return
              right.consequent.object.name = needToReplaceCode
            }
            if (right.type === 'Identifier') {
              if (typeof needToReplaceCode === 'string')
                right.name = needToReplaceCode

              else if (typeof needToReplaceCode === 'boolean')
                item.expression.right = t.booleanLiteral(needToReplaceCode)
            }
            const left = item.expression.left

            if (t.isMemberExpression(left)) {
              if (t.isIdentifier(left.object) && stateNameList.includes(left.object.name))
                left.object.name = 'this'
            }
            path.insertBefore(item)
          }
          else {
            path.insertBefore(item)
          }
        })
        path.remove()
      }
    },
    MemberExpression(path) {
      if (!t.isIdentifier(path.node.object))
        return
      if (stateNameList.includes(path.node.object.name))
        path.node.object.name = 'this'
    },
  })

  let state: t.Expression = objectExpression([])
  let stateTypeName = ''
  let actions: t.Expression = objectExpression([])
  traverse(ast, {
    Program(path) {
      path.node.body.unshift(t.importDeclaration([
        t.importSpecifier(t.identifier('defineStore'), t.identifier('defineStore')),
      ], t.stringLiteral('pinia')))
    },
    // 收集state和actions
    VariableDeclarator(path) {
      if (!path.node.init)
        return
      const id = path.node.id as t.Identifier
      if (id.name === 'state') {
        state = path.node.init
        if (t.isTSTypeAnnotation(id.typeAnnotation) && t.isTSTypeReference(id.typeAnnotation.typeAnnotation) && t.isIdentifier(id.typeAnnotation.typeAnnotation.typeName))
          stateTypeName = id.typeAnnotation.typeAnnotation.typeName.name || ''

        path.remove()
      }

      if (id.name === 'actions') {
        actions = path.node.init
        path.remove()
      }
    },
  })

  traverse(ast, {
    Program(path) {
      const storeName = id.split('/').pop()?.replace('.ts', '') as string
      /**
       * export const useAllAccountsStore = defineStore({
            id: "allAccounts",
            state: (): State => ({
              storeList: [],
              // 通用门店列表
              auctionPlatformList: [] // 拍卖平台列表
            }),
            actions: {}
          })
       */
      const stateResult = t.arrowFunctionExpression([], state)
      if (stateTypeName)
        stateResult.returnType = t.tsTypeAnnotation(t.tsTypeReference(t.identifier(stateTypeName)))

      path.node.body.push(
        t.exportNamedDeclaration(
          t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier(`use${storeName.charAt(0).toUpperCase() + storeName.slice(1)}Store`),
              t.callExpression(
                t.identifier('defineStore'),
                [
                  t.objectExpression([
                    t.objectProperty(t.identifier('id'), t.stringLiteral(storeName)),
                    t.objectProperty(t.identifier('state'), stateResult),
                    t.objectProperty(t.identifier('actions'), actions),
                  ]),
                ],
              ),
            ),
          ]),
        ),
      )
    },
  })

  const result = new generator.CodeGenerator(ast, { }, code).generate()

  if (!result.code)
    console.error('replaceClassPropertyToRefOrReactive: 转换出错')

  return result.code || ''
}
